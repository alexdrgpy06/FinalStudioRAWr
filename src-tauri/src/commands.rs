use image::DynamicImage;
use serde::{Deserialize, Serialize};
use base64::{Engine as _, engine::general_purpose};
use tauri::{AppHandle, Emitter, Runtime};
use log::{info, error};
use std::sync::Arc;
use std::fs;
use std::path::Path;
use tokio::sync::Semaphore;
use crate::image_ops;

#[derive(Deserialize, Clone)]
pub struct ProcessOptions {
    pub exposure: f32,
    pub contrast: f32,
    pub saturation: f32,
    pub vibrance: f32,
    pub highlights: f32,
    pub shadows: f32,
    pub clarity: f32,
    pub adaptive_threshold: bool,
    pub denoise: bool,
    pub lut_path: Option<String>,
    pub watermark_text: Option<String>,
    pub logo_path: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct ProcessResult {
    pub success: bool,
    pub path: String,
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct ProgressPayload {
    pub path: String,
    pub success: bool,
    pub error: Option<String>,
    pub progress: f32,
    pub stage: String,
}

#[tauri::command]
pub fn decode_raw(path: String) -> Result<String, String> {
    if !std::path::Path::new(&path).exists() {
        return Err(format!("File not found: {}", path));
    }
    let img = image_ops::decode_raw_to_image(&path)?;
    let thumb = img.thumbnail(1200, 1200);
    let mut buffer = std::io::Cursor::new(Vec::new());
    thumb.write_to(&mut buffer, image::ImageFormat::Jpeg).map_err(|e| e.to_string())?;
    let base64_str = general_purpose::STANDARD.encode(buffer.into_inner());
    Ok(format!("data:image/jpeg;base64,{}", base64_str))
}

pub fn process_image_inner<R: Runtime>(
    app: &AppHandle<R>,
    path: String,
    out_path: String,
    options: ProcessOptions,
    progress: f32,
) -> ProcessResult {
    let emit = |stage: &str, success: bool, error: Option<String>| {
        let _ = app.emit("process-progress", ProgressPayload {
            path: path.clone(),
            success,
            error,
            progress,
            stage: stage.to_string(),
        });
    };

    emit("processing", true, None);
    let path_lc = path.to_lowercase();
    let img_res = if path_lc.ends_with(".arw") || path_lc.ends_with(".cr2") || path_lc.ends_with(".nef") || path_lc.ends_with(".dng") {
        image_ops::decode_raw_to_image(&path)
    } else {
        image::open(&path).map_err(|e| e.to_string())
    };

    match img_res {
        Ok(img) => {
            let img = image_ops::apply_filters(img, &options);

            // Ensure parent directory exists
            if let Some(parent) = Path::new(&out_path).parent() {
                if let Err(e) = fs::create_dir_all(parent) {
                    let err_msg = format!("Failed to create directory: {}", e);
                    emit("failed", false, Some(err_msg.clone()));
                    return ProcessResult { success: false, path: out_path, error: Some(err_msg) };
                }
            }

            match img.save(&out_path) {
                Ok(_) => {
                    emit("completed", true, None);
                    ProcessResult { success: true, path: out_path, error: None }
                },
                Err(e) => {
                    let err_msg = format!("Failed to save image: {}", e);
                    emit("failed", false, Some(err_msg.clone()));
                    ProcessResult { success: false, path: out_path, error: Some(err_msg) }
                },
            }
        }
        Err(e) => {
            emit("failed", false, Some(e.clone()));
            ProcessResult { success: false, path: out_path, error: Some(e) }
        }
    }
}

#[tauri::command]
pub async fn process_bulk(app: AppHandle, files: Vec<(String, String)>, options: ProcessOptions) -> Result<(), String> {
    let total = files.len() as f32;
    let concurrency = (num_cpus::get() as f32 * 0.75).ceil() as usize;
    let semaphore = Arc::new(Semaphore::new(concurrency));
    let mut handles = Vec::new();

    for (i, (in_p, out_p)) in files.into_iter().enumerate() {
        let app_h = app.clone();
        let options_h = options.clone();
        let sem_h = semaphore.clone();
        let progress = ((i + 1) as f32 / total) * 100.0;
        let handle = tokio::spawn(async move {
            let _permit = sem_h.acquire().await.unwrap();
            tokio::task::spawn_blocking(move || {
                process_image_inner(&app_h, in_p, out_p, options_h, progress)
            }).await.unwrap()
        });
        handles.push(handle);
    }
    for handle in handles { let _ = handle.await; }
    Ok(())
}
