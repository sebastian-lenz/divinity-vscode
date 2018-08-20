export default function debounce<T extends Function>(
  callback: T,
  time: number
) {
  let interval: NodeJS.Timer | undefined;
  return (...args: Array<any>) => {
    if (interval) clearTimeout(interval);
    interval = setTimeout(() => {
      interval = undefined;
      callback(...args);
    }, time);
  };
}
