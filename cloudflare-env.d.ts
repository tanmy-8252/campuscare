declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
    BUCKET?: R2Bucket;
  }
}
