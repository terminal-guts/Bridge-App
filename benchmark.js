// Benchmark script to simulate ProfileEditScreen photo upload

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const logger = {
  error: console.error,
  info: console.info
};

// Mock uploadPhoto function
const uploadPhoto = async (url, order, isMain) => {
  await sleep(500); // Simulate network delay
  if (url === 'file://error') {
    return { ok: false, error: { message: 'Upload failed' } };
  }
  return { ok: true, data: { photo: { url, order, isMain } } };
};

const profile = {
  photos: [
    { url: 'file://1', order: 0, isMain: true },
    { url: 'file://2', order: 1, isMain: false },
    { url: 'file://3', order: 2, isMain: false },
    { url: 'https://existing-photo', order: 3, isMain: false },
  ]
};

async function runSequential() {
  console.log("Running sequential upload...");
  const start = Date.now();
  const uploadedPhotos = [];

  for (const photo of profile.photos || []) {
    if (photo.url.startsWith('file://')) {
      const uploadRes = await uploadPhoto(photo.url, photo.order, photo.isMain);
      if (uploadRes.ok && uploadRes.data) {
        uploadedPhotos.push(uploadRes.data.photo);
      } else {
        logger.error('Photo upload failed:', uploadRes.error?.message);
        return;
      }
    } else {
      uploadedPhotos.push(photo);
    }
  }

  const duration = Date.now() - start;
  console.log(`Sequential took ${duration}ms`);
  return duration;
}

async function runConcurrent() {
  console.log("Running concurrent upload...");
  const start = Date.now();

  const uploadPromises = (profile.photos || []).map(async (photo) => {
    if (photo.url.startsWith('file://')) {
      const uploadRes = await uploadPhoto(photo.url, photo.order, photo.isMain);
      if (uploadRes.ok && uploadRes.data) {
        return { success: true, photo: uploadRes.data.photo };
      } else {
        return { success: false, error: uploadRes.error?.message || 'Unknown error' };
      }
    } else {
      return { success: true, photo: photo };
    }
  });

  const uploadResults = await Promise.all(uploadPromises);
  const uploadedPhotos = [];

  for (const result of uploadResults) {
    if (!result.success) {
      logger.error('Photo upload failed:', result.error);
      return;
    }
    uploadedPhotos.push(result.photo);
  }

  const duration = Date.now() - start;
  console.log(`Concurrent took ${duration}ms`);
  return duration;
}

async function runBenchmark() {
  const seqDuration = await runSequential();
  const concDuration = await runConcurrent();
  console.log(`\nImprovement: ${seqDuration - concDuration}ms (${((seqDuration - concDuration) / seqDuration * 100).toFixed(2)}% faster)`);
}

runBenchmark();
