export default async function sleep(duration: number = 500): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), duration);
  });
}
