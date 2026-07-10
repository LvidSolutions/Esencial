export const projectSchema = {
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    { name: "title", title: "Project title", type: "string", validation: (Rule: any) => Rule.required() },
    { name: "slug", title: "URL", type: "slug", options: { source: "title" }, validation: (Rule: any) => Rule.required() },
    { name: "language", title: "Language", type: "string", options: { list: ["sv", "en"] }, validation: (Rule: any) => Rule.required() },
    { name: "summary", title: "Project introduction", type: "text", validation: (Rule: any) => Rule.required().min(40).max(700) },
    { name: "location", title: "Published location", type: "string" },
    { name: "year", title: "Year", type: "number" },
    { name: "status", title: "Status", type: "string", options: { list: ["draft", "review", "published", "archived"] } },
    { name: "images", title: "Images", type: "array", of: [{ type: "image", options: { hotspot: true }, fields: [{ name: "alt", title: "Image description", type: "string", validation: (Rule: any) => Rule.required() }, { name: "credit", title: "Credit", type: "string" }] }] },
    { name: "seoTitle", title: "Search title", type: "string", validation: (Rule: any) => Rule.max(60) },
    { name: "seoDescription", title: "Search description", type: "text", validation: (Rule: any) => Rule.max(160) }
  ]
};
