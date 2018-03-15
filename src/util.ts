// Lighter Object.assign stand-in
export function assign(
  obj: { [index: string]: any },
  props: { [index: string]: any }
) {
  for (let i in props) obj[i] = props[i];
  return obj;
}
