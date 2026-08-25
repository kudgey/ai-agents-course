import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import './style.css'

import Figure from './components/Figure.vue'
import PresToggle from './components/PresToggle.vue'
import TokenizerLab from './components/TokenizerLab.vue'
import SamplingLab from './components/SamplingLab.vue'
import CosineLab from './components/CosineLab.vue'
import AttentionLab from './components/AttentionLab.vue'
import KVCacheLab from './components/KVCacheLab.vue'
import ContextCostLab from './components/ContextCostLab.vue'
import ScalingLab from './components/ScalingLab.vue'
import SystemMap from './components/SystemMap.vue'
import LatencyLab from './components/LatencyLab.vue'
import CILab from './components/CILab.vue'
import PassKLab from './components/PassKLab.vue'
import PromptAnatomy from './components/PromptAnatomy.vue'
import RunOutput from './components/RunOutput.vue'
import CourseHome from './components/CourseHome.vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(PresToggle),
    })
  },
  enhanceApp({ app }) {
    app.component('Figure', Figure)
    app.component('TokenizerLab', TokenizerLab)
    app.component('SamplingLab', SamplingLab)
    app.component('CosineLab', CosineLab)
    app.component('AttentionLab', AttentionLab)
    app.component('KVCacheLab', KVCacheLab)
    app.component('ContextCostLab', ContextCostLab)
    app.component('ScalingLab', ScalingLab)
    app.component('SystemMap', SystemMap)
    app.component('LatencyLab', LatencyLab)
    app.component('CILab', CILab)
    app.component('PassKLab', PassKLab)
    app.component('PromptAnatomy', PromptAnatomy)
    app.component('RunOutput', RunOutput)
    app.component('CourseHome', CourseHome)
  },
} satisfies Theme
