<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import SiteNav from '@/components/SiteNav.vue'
import HeroSection from '@/sections/HeroSection.vue'
import OverviewSection from '@/sections/OverviewSection.vue'
import SiteFooter from '@/sections/SiteFooter.vue'
import AnnotationSection from '@/sections/AnnotationSection.vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

/** Below-the-fold and heavy sections load on demand. */
const AbstractSection = defineAsyncComponent(() => import('@/sections/AbstractSection.vue'))
const AcquisitionSection = defineAsyncComponent(() => import('@/sections/AcquisitionSection.vue'))
const DataSection = defineAsyncComponent(() => import('@/sections/DataSection.vue'))
const ResearchSection = defineAsyncComponent(() => import('@/sections/ResearchSection.vue'))
const FormatSection = defineAsyncComponent(() => import('@/sections/FormatSection.vue'))
const PipelineSection = defineAsyncComponent(() => import('@/sections/PipelineSection.vue'))
const AccessSection = defineAsyncComponent(() => import('@/sections/AccessSection.vue'))
const ReleaseSection = defineAsyncComponent(() => import('@/sections/ReleaseSection.vue'))
</script>

<template>
  <a class="skip-link" href="#main">{{ t({ en: 'Skip to content', zh: '跳到正文' }) }}</a>
  <SiteNav />

  <main id="main">
    <HeroSection />
    <AbstractSection />
    <OverviewSection />
    <AcquisitionSection />
    <DataSection />
    <AnnotationSection />
    <ResearchSection />
    <FormatSection />
    <PipelineSection />
    <AccessSection />
    <ReleaseSection />
  </main>

  <SiteFooter />
</template>
