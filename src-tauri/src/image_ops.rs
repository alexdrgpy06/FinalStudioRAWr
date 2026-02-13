use image::{DynamicImage, ImageBuffer, Rgb};
use crate::commands::ProcessOptions;
use rayon::prelude::*;

/// Decodes a RAW file into a DynamicImage.
/// Uses a custom half-size demosaicing algorithm to provide color previews.
pub fn decode_raw_to_image(path: &str) -> Result<DynamicImage, String> {
    let raw = rawloader::decode_file(path).map_err(|e| e.to_string())?;
    let width = raw.width;
    let height = raw.height;
    
    match raw.data {
        rawloader::RawImageData::Integer(ref data) => {
            let out_w = width / 2;
            let out_h = height / 2;
            let mut vec = Vec::with_capacity(out_w * out_h * 3);
            
            for y in 0..out_h {
                for x in 0..out_w {
                    let idx = (y * 2) * width + (x * 2);
                    vec.push((data[idx] >> 8) as u8);
                    vec.push((((data[idx + 1] as u32 + data[idx + width] as u32) / 2) >> 8) as u8);
                    vec.push((data[idx + width + 1] >> 8) as u8);
                }
            }
            
            let img = ImageBuffer::<Rgb<u8>, _>::from_raw(out_w as u32, out_h as u32, vec)
                .ok_or("Failed to create image buffer")?;
            Ok(DynamicImage::ImageRgb8(img))
        },
        rawloader::RawImageData::Float(ref data) => {
            let out_w = width / 2;
            let out_h = height / 2;
            let mut vec = Vec::with_capacity(out_w * out_h * 3);
            for y in 0..out_h {
                for x in 0..out_w {
                    let idx = (y * 2) * width + (x * 2);
                    vec.push((data[idx].clamp(0.0, 1.0) * 255.0) as u8);
                    vec.push((((data[idx + 1] + data[idx + width]) / 2.0).clamp(0.0, 1.0) * 255.0) as u8);
                    vec.push((data[idx + width + 1].clamp(0.0, 1.0) * 255.0) as u8);
                }
            }
            let img = ImageBuffer::<Rgb<u8>, _>::from_raw(out_w as u32, out_h as u32, vec)
                .ok_or("Failed to create image buffer")?;
            Ok(DynamicImage::ImageRgb8(img))
        }
    }
}

/// Professional RAW Processing Filters (Lightroom Style)
pub fn apply_filters(mut img: DynamicImage, options: &ProcessOptions) -> DynamicImage {
    // 1. Exposure (Brightness mapping)
    if options.exposure != 0.0 {
        img = img.brighten((options.exposure * 100.0) as i32);
    }

    // 2. Contrast
    if options.contrast != 1.0 {
        img = img.adjust_contrast(options.contrast);
    }

    // 3. Parallelized Saturation & Vibrance
    if options.saturation != 1.0 || options.vibrance != 0.0 {
        if let DynamicImage::ImageRgb8(mut rgb) = img {
            rgb.pixels_mut().par_bridge().for_each(|pixel| {
                let r = pixel[0] as f32;
                let g = pixel[1] as f32;
                let b = pixel[2] as f32;
                
                // Luma (Rec. 709)
                let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                
                // Saturation adjustment
                let mut nr = l + (r - l) * options.saturation;
                let mut ng = l + (g - l) * options.saturation;
                let mut nb = l + (b - l) * options.saturation;
                
                // Simple Vibrance (more saturation for less saturated pixels)
                if options.vibrance != 0.0 {
                    let max = r.max(g).max(b);
                    let min = r.min(g).min(b);
                    let sat = (max - min) / (max + 1e-5);
                    let factor = options.vibrance * (1.0 - sat);
                    nr += (nr - l) * factor;
                    ng += (ng - l) * factor;
                    nb += (nb - l) * factor;
                }

                pixel[0] = nr.clamp(0.0, 255.0) as u8;
                pixel[1] = ng.clamp(0.0, 255.0) as u8;
                pixel[2] = nb.clamp(0.0, 255.0) as u8;
            });
            img = DynamicImage::ImageRgb8(rgb);
        }
    }

    // 4. Shadows & Highlights (Basic curve mapping)
    if options.shadows != 0.0 || options.highlights != 0.0 {
        // Implementation for shadow/highlight recovery
        // Placeholder for more complex spline math
    }

    // 5. Denoise
    if options.denoise {
        let rgb = img.to_rgb8();
        img = DynamicImage::ImageRgb8(imageproc::filter::median_filter(&rgb, 1, 1));
    }

    // 6. Adaptive Threshold
    if options.adaptive_threshold {
        let luma = img.to_luma8();
        img = DynamicImage::ImageLuma8(imageproc::contrast::adaptive_threshold(&luma, 10));
    }

    img
}
