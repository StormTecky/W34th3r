import { screen } from '@testing-library/react-native';
import type { JsonElement } from 'test-renderer';

export type TreeNode = JsonElement;

/** Visits every element of the rendered tree. */
export function walk(
  node: TreeNode | TreeNode[] | string | null,
  visit: (node: TreeNode) => void,
): void {
  if (!node || typeof node === 'string') return;
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit));
  visit(node);
  (node.children ?? []).forEach((child) => walk(child as TreeNode, visit));
}

/** All rendered elements matching a predicate. */
export function collect(predicate: (node: TreeNode) => boolean): TreeNode[] {
  const found: TreeNode[] = [];
  walk(screen.toJSON() as TreeNode | TreeNode[] | null, (node) => {
    if (predicate(node)) found.push(node);
  });
  return found;
}

/** The text content of a node and its descendants. */
export function textOf(node: TreeNode | string | null): string {
  if (node === null) return '';
  if (typeof node === 'string') return node;
  return (node.children ?? []).map((child) => textOf(child as TreeNode | string)).join('');
}

/** Everything a user can read on the current screen, as one string. */
export function screenText(): string {
  return textOf({ children: [screen.toJSON()].flat() } as unknown as TreeNode);
}
