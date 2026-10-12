const SCALE = screen.width / 1280;

const TRANSFORM_PX = 512;

export const px = n => Math.round(n * SCALE);

export const logical = n => n / SCALE;

export const canScale = (width, height) => px(width) <= TRANSFORM_PX && px(height) <= TRANSFORM_PX;
