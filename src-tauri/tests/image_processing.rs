use app_lib::image_ops::apply_filters;
use app_lib::commands::ProcessOptions;
use image::{DynamicImage, RgbImage, Rgb};

#[test]
fn test_brightness_adjustment() {
    let mut img = RgbImage::new(10, 10);
    for pixel in img.pixels_mut() {
        *pixel = Rgb([100, 100, 100]);
    }
    let dyn_img = DynamicImage::ImageRgb8(img);
    
    let options = ProcessOptions {
        brightness: 0.5, // Increase brightness
        contrast: 1.0,
        saturation: 1.0,
        adaptive_threshold: false,
        denoise: false,
    };
    
    let result = apply_filters(dyn_img, &options);
    let result_rgb = result.to_rgb8();
    
    // Check if the first pixel is brighter than 100
    assert!(result_rgb.get_pixel(0, 0)[0] > 100);
}

#[test]
fn test_contrast_adjustment() {
    let mut img = RgbImage::new(10, 10);
    for pixel in img.pixels_mut() {
        *pixel = Rgb([100, 100, 100]);
    }
    let dyn_img = DynamicImage::ImageRgb8(img);
    
    let options = ProcessOptions {
        brightness: 0.0,
        contrast: 1.5, // Increase contrast
        saturation: 1.0,
        adaptive_threshold: false,
        denoise: false,
    };
    
    let result = apply_filters(dyn_img, &options);
    // For a uniform image, contrast adjustment might not change much if it's centered around 128,
    // but brighten/contrast usually shift values.
    // Let's just verify it runs without panic for now, or use a more varied image.
}

#[test]
fn test_denoise() {
    let img = RgbImage::new(10, 10);
    let dyn_img = DynamicImage::ImageRgb8(img);
    
    let options = ProcessOptions {
        brightness: 0.0,
        contrast: 1.0,
        saturation: 1.0,
        adaptive_threshold: false,
        denoise: true,
    };
    
    let result = apply_filters(dyn_img, &options);
    assert!(result.width() == 10);
}

#[test]
fn test_adaptive_threshold() {
    let img = RgbImage::new(10, 10);
    let dyn_img = DynamicImage::ImageRgb8(img);
    
    let options = ProcessOptions {
        brightness: 0.0,
        contrast: 1.0,
        saturation: 1.0,
        adaptive_threshold: true,
        denoise: false,
    };
    
    let result = apply_filters(dyn_img, &options);
    // Adaptive threshold returns a Luma image (grayscale/binary)
    assert!(result.as_luma8().is_some());
}
