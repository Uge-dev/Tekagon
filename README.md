# Tekagon

## Dashboard Content Management

The admin dashboard contains:

- **Social Cards**: edit each of the four dashboard cards independently.
- **Events**: edit the event hero, registration details, platform, and speaker cards.

Content is saved in MongoDB through the backend API.

## Cloudinary Image Uploads

1. Create or sign in to a Cloudinary account.
2. Copy the **Cloud name** from the Cloudinary dashboard.
3. Open **Settings > Upload > Upload presets**.
4. Create an **unsigned** upload preset and restrict its allowed file types and maximum image size.
5. Add these public values to the Vercel frontend environment:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
```

6. Redeploy the frontend after adding the variables.

The admin image fields accept either a pasted Cloudinary image URL or a local image selected with the **Upload** button. Never place a Cloudinary API secret in Vercel frontend variables.
