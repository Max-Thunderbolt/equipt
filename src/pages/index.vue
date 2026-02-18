<template>
  <div class="index-page">
    <div class="scroll-story" ref="scrollStoryRef">
      <div class="scroll-story__slide scroll-story__slide--video">
        <div class="video-container">
          <video controls width="100%" height="100%" src="../assets/anim.mp4" autoplay muted playsinline loop>
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
      <section ref="createSectionRef" class="scroll-story__slide create-section" :style="createSectionStyle">
        <div class="create-section__image">
          <img :src="createImage" alt="" class="create-section__img" aria-hidden="true">
        </div>
        <div class="create-section__card">
          <div class="create-card">
            <div class="create-card__content">
              <img :src="arrowSvg" alt="" class="create-card__arrow" aria-hidden="true">
              <h1 class="create-card__title">To Create.</h1>
              <p class="create-card__text">
                To Create is a statement that embodies innovation, imagination, and action.
                <br>
                <br>
                Its meaning is significant across different domains: art, technology, business, and personal growth.
                <br>
                <br>
                Creativity is not limited to artists.
                <br>
                It's a way of thinking.
                <br>
                <br>
                Engineers create solutions, entrepreneurs create businesses, and individuals
                create their own paths. It implies breaking boundaries, experimenting, and refusing to accept
                stagnation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section ref="whoSectionRef" class="scroll-story__slide who-section" :style="whoSectionStyle">
        <div class="who-section__content">
          <h2 class="who-section__title">Who we are.</h2>
          <p class="who-section__text">
            Equipt is a South African based brand built on empowerment, performance and efficiency.
          </p>
          <p class="who-section__text">
            Our Platform is intentionally designed with individuals toughest challenges in mind.
          </p>
          <p class="who-section__text">
            By blending accessibility with professional design, we give users digestable, inspirational and solution
            driven
            approaches that reflect their unique needs.
          </p>
        </div>
        <div class="who-section__visual">
          <div class="who-section__cards">
            <div class="who-card who-card--filled">
              <img :src="arrowSvg" alt="" class="who-card__arrow" aria-hidden="true">
              <h3 class="who-card__heading">Key Traits:</h3>
              <ul class="who-card__list">
                <li>Succinct</li>
                <li>Universal</li>
                <li>Conversational</li>
                <li>Charming</li>
              </ul>
            </div>
            <div class="who-card"></div>
            <div class="who-card"></div>
          </div>
          <!-- <img :src="createImage" alt="Equipt" class="who-section__logo" aria-hidden="true"> -->
        </div>
      </section>

      <section ref="missionSectionRef" class="scroll-story__slide mission-section" :style="missionSectionStyle">
        <div class="mission-section__content">
          <h2 class="mission-section__title">Mission & Core Values.</h2>
          <h3 class="mission-section__subtitle">Our Mission:</h3>
          <p class="mission-section__text">
            To create quality, crafted solutions which blend durability and style, effortlessly and practically. Helping
            people create the most functional and beautiful creative solution for their specific context.
          </p>
          <h3 class="mission-section__subtitle">Core Values:</h3>
          <ul class="mission-section__list">
            <li>Solution Driven</li>
            <li>Authenticity</li>
            <li>Intentionality</li>
            <li>Efficiency</li>
            <li>Quality</li>
          </ul>
        </div>
        <div class="mission-section__visual">
          <div class="mission-section__pills">
            <div class="mission-pill"> Solution Driven</div>
            <div class="mission-pill"> Authenticity</div>
            <div class="mission-pill"> Intentionality</div>
            <div class="mission-pill"> Efficiency</div>
            <div class="mission-pill"> Quality</div>
          </div>
          <img :src="createImage" alt="Equipt" class="mission-section__logo" aria-hidden="true">
        </div>
      </section>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import arrowSvg from '@/assets/arrow.svg'
import createImage from '@/assets/equiptOrangeIcon.png'

const scrollStoryRef = ref(null)
const createSectionRef = ref(null)
const whoSectionRef = ref(null)
const missionSectionRef = ref(null)

const createSectionStyle = reactive({ transform: 'scale(0.6)', opacity: '0' })
const whoSectionStyle = reactive({ transform: 'scale(0.6)', opacity: '0' })
const missionSectionStyle = reactive({ transform: 'scale(0.6)', opacity: '0' })

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function updateScrollEffects() {
  const el = scrollStoryRef.value
  if (!el || !createSectionRef.value || !whoSectionRef.value || !missionSectionRef.value) return

  const scrollTop = el.scrollTop
  const vh = el.clientHeight
  const createTop = createSectionRef.value.offsetTop
  const createHeight = createSectionRef.value.offsetHeight
  const whoTop = whoSectionRef.value.offsetTop
  const whoHeight = whoSectionRef.value.offsetHeight
  const missionTop = missionSectionRef.value.offsetTop

  // To Create: zoom in as we scroll into it (createTop - vh → createTop), zoom out as we scroll to Who (createTop → createTop + createHeight)
  const createEnter = clamp((scrollTop - (createTop - vh)) / vh, 0, 1)
  const createLeave = clamp((scrollTop - createTop) / (createHeight * 0.7), 0, 1)
  const createVisible = createEnter < 1 ? createEnter : Math.max(0, 1 - createLeave)
  const createScale = 0.5 + 0.5 * createVisible
  createSectionStyle.transform = `scale(${createScale})`
  createSectionStyle.opacity = String(createVisible)

  // Who we are: zoom in as we scroll into it, zoom out as we scroll to Mission
  const whoEnter = clamp((scrollTop - (whoTop - vh)) / vh, 0, 1)
  const whoLeave = clamp((scrollTop - whoTop) / (whoHeight * 0.7), 0, 1)
  const whoVisible = whoEnter < 1 ? whoEnter : Math.max(0, 1 - whoLeave)
  const whoScale = 0.5 + 0.5 * whoVisible
  whoSectionStyle.transform = `scale(${whoScale})`
  whoSectionStyle.opacity = String(whoVisible)

  // Mission: zoom in as we scroll into it
  const missionEnter = clamp((scrollTop - (missionTop - vh)) / vh, 0, 1)
  const missionScale = 0.5 + 0.5 * missionEnter
  missionSectionStyle.transform = `scale(${missionScale})`
  missionSectionStyle.opacity = String(missionEnter)
}

onMounted(() => {
  const el = scrollStoryRef.value
  if (!el) return
  el.addEventListener('scroll', updateScrollEffects, { passive: true })
  updateScrollEffects()
})

onUnmounted(() => {
  const el = scrollStoryRef.value
  if (el) el.removeEventListener('scroll', updateScrollEffects)
})
</script>

<style scoped>
.index-page {
  height: 100vh;
  position: relative;
  background: #000;
}

.scroll-story {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

.scroll-story__slide {
  height: 100vh;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  box-sizing: border-box;
}

.scroll-story__slide--video {
  padding: 0;
}

.scroll-story__slide--video .video-container {
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.scroll-story__slide--video .video-container video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scroll-story__hint {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: rgba(255, 255, 255, 0.8);
  font-family: var(--font-sans), sans-serif;
  font-size: 0.875rem;
  pointer-events: none;
  z-index: 50;
  animation: scroll-hint-bounce 2s ease-in-out infinite;
}

@keyframes scroll-hint-bounce {

  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }

  50% {
    transform: translateX(-50%) translateY(4px);
  }
}

.create-section {
  margin: 0;
  padding: 0 1rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: center;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  box-sizing: border-box;
}

.create-section__image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.create-section__img {
  width: 100%;
  max-width: 400px;
  height: auto;
  object-fit: contain;
}

.create-section__card {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .create-section {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .create-section__card {
    justify-content: stretch;
  }

  .create-card {
    border-radius: 24px;
  }
}

.create-card {
  max-width: 520px;
  width: 100%;
  /* Asymmetric: rounded on the right, square on the left */
  border-radius: 0 32px 32px 0;
  /* Gradient: purplish-pink top → greenish-blue bottom, semi-transparent */
  background: linear-gradient(180deg,
      rgba(220, 190, 230, 0.4) 0%,
      rgba(180, 220, 230, 0.4) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.create-card__content {
  padding: 2rem 2.5rem 2.5rem;
  position: relative;
}

.create-card__arrow {
  width: 2rem;
  height: 2rem;
  filter: brightness(0) invert(1);
  margin-bottom: 0.75rem;
  display: block;
}

.create-card__title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 1.25rem;
  font-family: var(--font-sans), sans-serif;
  line-height: 1.2;
}

.create-card__text {
  font-size: 0.9375rem;
  line-height: 1.65;
  color: #fff;
  margin: 0;
  font-family: var(--font-sans), sans-serif;
}

/* Who we are section: left = white text, right = black + gradient cards */
.who-section {
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  box-sizing: border-box;
}

.who-section__content {
  background: #fff;
  padding: 3rem 2.5rem 3rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: 24px 0 0 24px;
}

.who-section__title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #000;
  margin: 0 0 0.5rem;
  font-family: var(--font-sans), sans-serif;
}

.who-section__text {
  font-size: 1rem;
  line-height: 1.6;
  color: #000;
  margin: 0;
  font-family: var(--font-sans), sans-serif;
}

.who-section__visual {
  border-radius: 0 24px 24px 0;
  background: #000;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.who-section__cards {
  display: flex;
  gap: 1rem;
  flex: 1;
  width: 100%;
  max-width: 480px;
  align-items: stretch;
  justify-content: center;
}

.who-card {
  flex: 1;
  min-width: 0;
  border-radius: 24px;
  background: linear-gradient(180deg,
      rgba(140, 100, 180, 0.5) 0%,
      rgba(242, 160, 100, 0.5) 100%);
  min-height: 280px;
}

.who-card--filled {
  padding: 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.who-card__arrow {
  width: 1.5rem;
  height: 1.5rem;
  filter: brightness(0) invert(1);
  display: block;
}

.who-card__heading {
  font-size: 1rem;
  font-weight: 700;
  color: #000;
  margin: 0;
  font-family: var(--font-sans), sans-serif;
}

.who-card__list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: #000;
  font-family: var(--font-sans), sans-serif;
}

.who-section__logo {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}

/* Mission & Core Values section */
.mission-section {
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  box-sizing: border-box;
}

.mission-section__content {
  background: #000;
  padding: 3rem 2.5rem 3rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: 24px 0 0 24px;
}

.mission-section__title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem;
  font-family: var(--font-sans), sans-serif;
  line-height: 1.2;
}

.mission-section__subtitle {
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
  margin: 0.5rem 0 0.25rem;
  font-family: var(--font-sans), sans-serif;
}

.mission-section__text {
  font-size: 1rem;
  line-height: 1.6;
  color: #fff;
  margin: 0;
  font-family: var(--font-sans), sans-serif;
}

.mission-section__list {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
  font-size: 1rem;
  line-height: 1.7;
  color: #fff;
  font-family: var(--font-sans), sans-serif;
  list-style-type: square;
}

.mission-section__visual {
  background: #fff;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 0 24px 24px 0;
}

.mission-section__pills {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 320px;
  flex: 1;
  justify-content: center;
}

.mission-pill {
  height: 56px;
  border-radius: 9999px;
  background: linear-gradient(90deg,
      rgba(255, 200, 180, 0.5) 0%,
      rgba(160, 140, 180, 0.5) 100%);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-family: var(--font-sans), sans-serif;
  font-size: 1rem;
  font-weight: 500;
}

.mission-section__logo {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}

@media (max-width: 768px) {

  .who-section,
  .mission-section {
    grid-template-columns: 1fr;
  }

  .who-section__cards {
    flex-direction: column;
    max-height: 320px;
  }

  .who-card {
    min-height: 120px;
  }
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
