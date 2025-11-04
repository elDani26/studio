import { redirect } from 'next/navigation';

// This page only renders for the root `/` URL.
export default function RootPage() {
  redirect('/es');
}
