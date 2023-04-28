import got from 'got';

async function setup() {
  const packages = [
    '@carbon/colors',
    '@carbon/react',
    '@carbon/icons-react',
    '@carbon/pictograms-react',
    '@carbon/layout',
    '@carbon/type',

    '@primer/react',
    '@primer/octicons-react',

    '@mui/material',
    '@shopify/polaris',
  ];

  for (const name of packages) {
    await got.post(`http://0.0.0.0:4000/packages`, {
      json: {
        name,
      },
    });
  }
}

setup().catch((error) => {
  console.log(error);
  process.exit(1);
});
