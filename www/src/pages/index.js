import { Page } from '../components/Page';
import { PageFooter } from '../components/PageFooter';
import { PageHeader } from '../components/PageHeader';

export default function IndexPage() {
  return (
    <Page>
      <PageHeader />
      <main>Hello world!</main>
      <PageFooter />
    </Page>
  );
}
