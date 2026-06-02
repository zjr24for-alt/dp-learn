import type { DocEntry } from "@/lib/types";
import { deepmdDocs } from "./deepmd";
import { vaspDocs } from "./vasp";
import { lammpsDocs } from "./lammps";

export const officialDocs: DocEntry[] = [
  ...deepmdDocs,
  ...vaspDocs,
  ...lammpsDocs,
];
