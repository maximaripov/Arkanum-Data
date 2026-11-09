// The whole paper on one page, to print or save as a PDF.
import type { Metadata } from "next";
import { BASE, TITLE, PaperPrintView } from "../paper";

export const metadata: Metadata = { title: `${TITLE} (PDF)`, alternates: { canonical: BASE }, robots: { index: false } };
export default function Print() { return <PaperPrintView />; }
