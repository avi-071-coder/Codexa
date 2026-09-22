// Categorizer — assigns a primary category to each submission

import type { NormalizedSubmission } from "../adapters/types";

// Known high-level categories for standardization.
const CATEGORY_MAP: Record<string, string> = {
  "array": "Arrays",
  "arrays": "Arrays",
  "string": "Strings",
  "strings": "Strings",
  "hash table": "Hash Table",
  "hash-table": "Hash Table",
  "dynamic programming": "Dynamic Programming",
  "dynamic-programming": "Dynamic Programming",
  "dp": "Dynamic Programming",
  "math": "Math",
  "sorting": "Sorting",
  "greedy": "Greedy",
  "depth-first search": "DFS",
  "dfs": "DFS",
  "breadth-first search": "BFS",
  "bfs": "BFS",
  "binary search": "Binary Search",
  "binary-search": "Binary Search",
  "tree": "Tree",
  "trees": "Tree",
  "binary tree": "Binary Tree",
  "graph": "Graph",
  "graphs": "Graph",
  "linked list": "Linked List",
  "linked-list": "Linked List",
  "stack": "Stack",
  "queue": "Queue",
  "heap": "Heap",
  "priority queue": "Heap",
  "two pointers": "Two Pointers",
  "two-pointers": "Two Pointers",
  "sliding window": "Sliding Window",
  "sliding-window": "Sliding Window",
  "backtracking": "Backtracking",
  "bit manipulation": "Bit Manipulation",
  "bit-manipulation": "Bit Manipulation",
  "design": "Design",
  "simulation": "Simulation",
  "recursion": "Recursion",
  "divide and conquer": "Divide and Conquer",
  "trie": "Trie",
  "union find": "Union Find",
  "segment tree": "Segment Tree",
  "monotonic stack": "Monotonic Stack",
};

// Categorize a submission into a standardized folder name.
export function categorize(submission: NormalizedSubmission): string {
  if (!submission.tags || submission.tags.length === 0) {
    return submission.category || "Misc";
  }

  const primaryTag = submission.tags[0].toLowerCase().trim();
  return CATEGORY_MAP[primaryTag] ?? submission.category ?? "Misc";
}
