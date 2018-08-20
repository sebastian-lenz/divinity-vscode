export default function ucfirst(value: string): string {
  return value.substr(0, 1).toUpperCase() + value.substr(1);
}
