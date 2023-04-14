function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function run() {
  await sleep(Math.random() * 5000 + 1000);
}
