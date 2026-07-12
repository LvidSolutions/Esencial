import type {StructureResolver} from 'sanity/structure'

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Esencial CMS')
    .items([
      S.listItem()
        .title('Att granska')
        .child(S.documentList().title('Att granska').filter('_type == "project" && status == "review"')),
      S.listItem()
        .title('Utkast')
        .child(S.documentList().title('Utkast').filter('_type == "project" && status == "draft"')),
      S.divider(),
      S.listItem()
        .title('Startsida')
        .child(S.document().schemaType('homePage').documentId('homePage')),
      S.divider(),
      S.listItem()
        .title('Svenska projekt')
        .child(S.documentList().title('Svenska projekt').filter('_type == "project" && language == "sv"')),
      S.listItem()
        .title('English projects')
        .child(S.documentList().title('English projects').filter('_type == "project" && language == "en"')),
      S.listItem()
        .title('Tjanster och services')
        .child(S.documentTypeList('service').title('Tjanster och services')),
      S.divider(),
      S.listItem()
        .title('Webbplatsinstallningar')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    ])
