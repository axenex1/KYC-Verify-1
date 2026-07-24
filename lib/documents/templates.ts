export interface DocumentTemplate {
  id: string;
  label: string;
  description: string;
  path: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "passport-mock",
    label: "Passport (Mock)",
    description: "Synthetic passport layout for document-capture QA",
    path: "/documents/passport-mock.svg",
  },
  {
    id: "drivers-license-mock",
    label: "Driver's License (Mock)",
    description: "Synthetic ID card layout for document-capture QA",
    path: "/documents/drivers-license-mock.svg",
  },
  {
    id: "national-id-mock",
    label: "National ID (Mock)",
    description: "Synthetic national ID layout for document-capture QA",
    path: "/documents/national-id-mock.svg",
  },
];

export const DEFAULT_DOCUMENT_TEMPLATE_ID = DOCUMENT_TEMPLATES[0].id;
