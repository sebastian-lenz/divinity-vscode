export default function lcfirst(value: string): string {
  return value.substr(0, 1).toLowerCase() + value.substr(1);
}
