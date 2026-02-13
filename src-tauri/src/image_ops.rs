use image::{DynamicImage, ImageBuffer, Rgb};
use crate::commands::ProcessOptions;
use rayon::prelude::*;

/// Decodes a RAW file into a DynamicImage.
/// Uses a custom half-size demosaicing algorithm to provide color previews.
pub fn decode_raw_to_image(path: &str) -> Result<DynamicImage, String> {
    let raw = rawloader::decode_file(path).map_err(|e| e.to_string())?;
    let width = raw.width;
    let height = raw.height;

    // Basic demosaicing requires even dimensions
    // We can handle odd dimensions by just ignoring the last pixel row/col for simplicity
    let out_w = width / 2;
    let out_h = height / 2;
    let max_val = raw.whitelevel.unwrap_or(65535) as f32; // Default to 16-bit if unknown

    // Pre-calculate pattern offsets for the first 2x2 block
    // CFA pattern is typically 2x2.
    // color_at(0,0), color_at(1,0), color_at(0,1), color_at(1,1)
    let c00 = raw.cfa.color_at(0, 0);
    let c10 = raw.cfa.color_at(1, 0);
    let c01 = raw.cfa.color_at(0, 1);
    let c11 = raw.cfa.color_at(1, 1);

    // Map the 4 pixels of a 2x2 block to R, G, B based on CFA
    // Usually:
    // RGGB -> R=0, G=1, B=2. (0,0)=R, (1,0)=G, (0,1)=G, (1,1)=B
    // We need to sum up values for each channel and divide by count.

    match raw.data {
        rawloader::RawImageData::Integer(ref data) => {
            let mut vec = Vec::with_capacity(out_w * out_h * 3);
            
            for y in 0..out_h {
                for x in 0..out_w {
                    // Safety check to ensure we don't access out of bounds
                    let base_idx = (y * 2) * width + (x * 2);
                    if base_idx + width + 1 >= data.len() {
                        continue;
                    }

                    let p00 = data[base_idx] as f32;
                    let p10 = data[base_idx + 1] as f32;
                    let p01 = data[base_idx + width] as f32;
                    let p11 = data[base_idx + width + 1] as f32;

                    let mut r_sum = 0.0; let mut r_cnt = 0.0;
                    let mut g_sum = 0.0; let mut g_cnt = 0.0;
                    let mut b_sum = 0.0; let mut b_cnt = 0.0;

                    let mut add_pixel = |color: usize, val: f32| {
                        if color == 0 { r_sum += val; r_cnt += 1.0; }
                        else if color == 1 { g_sum += val; g_cnt += 1.0; }
                        else if color == 2 { b_sum += val; b_cnt += 1.0; }
                    };

                    add_pixel(c00, p00);
                    add_pixel(c10, p10);
                    add_pixel(c01, p01);
                    add_pixel(c11, p11);

                    // Avoid division by zero, though in Bayer 2x2 it shouldn't happen for RGB
                    let r_val = if r_cnt > 0.0 { r_sum / r_cnt } else { 0.0 };
                    let g_val = if g_cnt > 0.0 { g_sum / g_cnt } else { 0.0 };
                    let b_val = if b_cnt > 0.0 { b_sum / b_cnt } else { 0.0 };

                    // Normalize to 0-255 range based on white level
                    let r = (r_val / max_val * 255.0).clamp(0.0, 255.0) as u8;
                    let g = (g_val / max_val * 255.0).clamp(0.0, 255.0) as u8;
                    let b = (b_val / max_val * 255.0).clamp(0.0, 255.0) as u8;

                    vec.push(r);
                    vec.push(g);
                    vec.push(b);
                }
            }
            
            // Adjust dimensions if loop broke early
            let img = ImageBuffer::<Rgb<u8>, _>::from_raw(out_w as u32, out_h as u32, vec)
                .ok_or("Failed to create image buffer from RAW data")?;
            Ok(DynamicImage::ImageRgb8(img))
        },
        rawloader::RawImageData::Float(ref data) => {
            let mut vec = Vec::with_capacity(out_w * out_h * 3);
            for y in 0..out_h {
                for x in 0..out_w {
                    let idx = (y * 2) * width + (x * 2);
                    if idx + width + 1 >= data.len() {
                        continue;
                    }

                    let p00 = data[idx] as f32;
                    let p10 = data[idx + 1] as f32;
                    let p01 = data[idx + width] as f32;
                    let p11 = data[idx + width + 1] as f32;

                    let mut r_sum = 0.0; let mut r_cnt = 0.0;
                    let mut g_sum = 0.0; let mut g_cnt = 0.0;
                    let mut b_sum = 0.0; let mut b_cnt = 0.0;

                    let mut add_pixel = |color: usize, val: f32| {
                        if color == 0 { r_sum += val; r_cnt += 1.0; }
                        else if color == 1 { g_sum += val; g_cnt += 1.0; }
                        else if color == 2 { b_sum += val; b_cnt += 1.0; }
                    };

                    add_pixel(c00, p00);
                    add_pixel(c10, p10);
                    add_pixel(c01, p01);
                    add_pixel(c11, p11);

                    let r_val = if r_cnt > 0.0 { r_sum / r_cnt } else { 0.0 };
                    let g_val = if g_cnt > 0.0 { g_sum / g_cnt } else { 0.0 };
                    let b_val = if b_cnt > 0.0 { b_sum / b_cnt } else { 0.0 };

                    let r = (r_val * 255.0).clamp(0.0, 255.0) as u8;
                    let g = (g_val * 255.0).clamp(0.0, 255.0) as u8;
                    let b = (b_val * 255.0).clamp(0.0, 255.0) as u8;

                    vec.push(r);
                    vec.push(g);
                    vec.push(b);
                }
            }
            let img = ImageBuffer::<Rgb<u8>, _>::from_raw(out_w as u32, out_h as u32, vec)
                .ok_or("Failed to create image buffer from Float RAW data")?;
            Ok(DynamicImage::ImageRgb8(img))
        }
    }
}

/// Professional RAW Processing Filters (Lightroom Style)
pub fn apply_filters(img: DynamicImage, options: &ProcessOptions) -> DynamicImage {
    let mut img = DynamicImage::ImageRgb8(img.to_rgb8());

    // 1. Exposure (Brightness mapping)
    if options.exposure != 0.0 {
        img = img.brighten((options.exposure * 100.0) as i32);
    }

    // 2. Contrast
    if options.contrast != 1.0 {
        img = img.adjust_contrast(options.contrast);
    }

    // 3. Parallelized Pixel Operations (Saturation, Vibrance, Shadows, Highlights)
    if options.saturation != 1.0 || options.vibrance != 0.0 || options.shadows != 0.0 || options.highlights != 0.0 {
        if let DynamicImage::ImageRgb8(mut rgb) = img {
            rgb.pixels_mut().par_bridge().for_each(|pixel| {
                let mut r = pixel[0] as f32;
                let mut g = pixel[1] as f32;
                let mut b = pixel[2] as f32;
                
                // Shadows & Highlights
                if options.shadows != 0.0 || options.highlights != 0.0 {
                    let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    let norm_luma = luma / 255.0;

                    let shadow_factor = (1.0 - norm_luma).powf(2.0) * options.shadows;
                    let highlight_factor = norm_luma.powf(2.0) * options.highlights;

                    // Apply simple gain adjustment
                    let adj = 1.0 + shadow_factor + highlight_factor;
                    r *= adj;
                    g *= adj;
                    b *= adj;

                    r = r.clamp(0.0, 255.0);
                    g = g.clamp(0.0, 255.0);
                    b = b.clamp(0.0, 255.0);
                }

                // Saturation & Vibrance
                if options.saturation != 1.0 || options.vibrance != 0.0 {
                    // Recalculate luma if it changed? For speed, we can reuse approx or recalc.
                    // Recalculating is safer.
                    let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;

                    let mut nr = l + (r - l) * options.saturation;
                    let mut ng = l + (g - l) * options.saturation;
                    let mut nb = l + (b - l) * options.saturation;

                    if options.vibrance != 0.0 {
                        let max = r.max(g).max(b);
                        let min = r.min(g).min(b);
                        let sat = (max - min) / (max + 1e-5);
                        let factor = options.vibrance * (1.0 - sat);
                        nr += (nr - l) * factor;
                        ng += (ng - l) * factor;
                        nb += (nb - l) * factor;
                    }
                    r = nr;
                    g = ng;
                    b = nb;
                }

                pixel[0] = r.clamp(0.0, 255.0) as u8;
                pixel[1] = g.clamp(0.0, 255.0) as u8;
                pixel[2] = b.clamp(0.0, 255.0) as u8;
            });
            img = DynamicImage::ImageRgb8(rgb);
        }
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
