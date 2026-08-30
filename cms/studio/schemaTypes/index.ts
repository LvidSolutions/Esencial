import {projectType} from './projectType'
import {serviceType} from './serviceType'
import {siteSettingsType} from './siteSettingsType'
import {homePageType} from './homePageType'
import {
  floorPlanType,
  projectCardImageType,
  projectGalleryImageType,
  projectHeroImageType,
  projectSlideshowImageType,
} from './imageTypes'
import {filterCategoryType} from './filterCategoryType'
import {navigationSettingsType} from './navigationSettingsType'

export const schemaTypes = [
  projectType,
  serviceType,
  siteSettingsType,
  homePageType,
  filterCategoryType,
  navigationSettingsType,
  projectHeroImageType,
  projectCardImageType,
  projectSlideshowImageType,
  projectGalleryImageType,
  floorPlanType,
]
