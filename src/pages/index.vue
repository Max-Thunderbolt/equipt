<template>
  <div class="container">
    <div class="hero">
      <h1>equipt.</h1>
      <p class="subtitle">Your creative project ideas, organized and shared.</p>


      <div class="video-container">
        <video controls width="100%" height="100%" src="../assets/anim.mp4" autoplay muted playsinline loop>
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero {
  text-align: center;
}

.hero h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--equipt-orange);
  font-family: var(--font-sans) !important;
}

.subtitle {
  font-size: 1.5rem;
  color: var(--white);
  margin-bottom: 2rem;
  font-family: var(--font-mono) !important;
}

.video-container {
  overflow: hidden;
  border-radius: 16px;
  box-shadow: 0 0 16px 0 rgba(var(--equipt-orange-RGB), 0.5);
  aspect-ratio: 16/9;
}

.video-container video {
  width: 100%;
  height: 100%;
}
</style>
