import { Page } from '../../components/Page';
import { PageFooter } from '../../components/PageFooter';
import { PageHeader } from '../../components/PageHeader';
import { Text } from '../../components/Text';

export default function QueuePage() {
  return (
    <Page>
      <PageHeader />
      <main className="container mx-auto pt-8">
        <Text asChild token="heading-01">
          <h1 className="gap-">Queue</h1>
        </Text>
      </main>
      <PageFooter />
    </Page>
  );
}
