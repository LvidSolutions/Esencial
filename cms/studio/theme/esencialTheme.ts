import {studioTheme} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {esencialVisualTokens} from './tokens'

const editorialFontFamily = esencialVisualTokens.typography.sans

export const esencialStudioTheme = buildTheme({
  font: {
    code: studioTheme.fonts.code,
    heading: {
      ...studioTheme.fonts.heading,
      family: editorialFontFamily,
      weights: {regular: 400, medium: 500, semibold: 600, bold: 700},
    },
    label: {...studioTheme.fonts.label, family: editorialFontFamily},
    text: {...studioTheme.fonts.text, family: editorialFontFamily},
  },
  media: studioTheme.media,
  radius: [0, 2, 4, 6, 8, 12, 16],
  space: [0, 4, 8, 12, 16, 24, 32, 48, 64, 80],
})
