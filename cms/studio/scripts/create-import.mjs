import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../../..')
const output = path.join(root, 'cms', 'studio', 'import', 'esencial.ndjson')
const baseUrl = 'https://www.esencial.se'

const projects = ['sv', 'en'].flatMap((language) => {
  const source = path.join(root, 'content', 'projects', `${language}.json`)
  return JSON.parse(fs.readFileSync(source, 'utf8')).map((project) => ({
    _id: `project-${language}-${project.id}`,
    _type: 'project',
    title: project.title,
    slug: {_type: 'slug', current: project.slug},
    language,
    translationKey: project.id,
    summary: project.description,
    location: project.location || undefined,
    status: 'published',
    seoTitle: `${project.title} | Esencial`,
    seoDescription: project.description,
    legacyImages: project.images.map((image, index) => ({_key: `${project.id}-${index}`, url: `${baseUrl}${image.src}`, alt: image.alt})),
  }))
})

const settings = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  siteName: 'Esencial',
  legalName: 'Esencial AB',
  email: 'contact@esencial.se',
  address: 'Ragvaldsgatan 19B, 118 46 Stockholm, Sweden',
  socialLinks: ['https://www.instagram.com/esencial_se/', 'https://www.facebook.com/esencialarkitekter/'],
  defaultSeoTitle: 'Esencial | Arkitektur och projekt i Stockholm',
  defaultSeoDescription: 'Esencial är ett progressivt arkitektkontor i Stockholm som utvecklar projekt från idé till genomförd arkitektur, med fokus på plats, materialitet och långsiktigt värde.',
}

fs.mkdirSync(path.dirname(output), {recursive: true})
fs.writeFileSync(output, [...projects, settings].map((document) => JSON.stringify(document)).join('\n') + '\n')
console.log(`Created ${projects.length + 1} Sanity import documents at ${output}`)
