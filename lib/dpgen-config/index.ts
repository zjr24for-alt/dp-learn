export { PARAM_SCHEMA } from "./param-schema";
export type { ParamField } from "./param-schema";
export { MACHINE_SCHEMA, getMachineDefaults } from "./machine-schema";
export type { MachineSegment } from "./machine-schema";
export { INCAR_SCHEMA, getIncarDefaults, parseIncar, validateIncar } from "./incar-schema";

export {
  validateParamJson,
  validateMachineSegment,
  validateIncarDeep,
  validateLammps,
  validateSubmitScript,
  runCrossChecks,
} from "./validate";
export type { CheckSeverity, CheckIssue, ValidationResult, CrossCheckParams } from "./validate";

export {
  buildParamPrompt,
  buildMachinePrompt,
  buildIncarPrompt,
  buildLammpsPrompt,
  buildSubmitPrompt,
} from "./prompts";

export { extractJsonFromText, extractIncarFromText, extractPlainText } from "./extract";
export type { ExtractJsonResult } from "./extract";

export { ELEMENT_MASSES, elementMass, normalizeElementSymbol, parseElements } from "./periodic-table";
export { applyMaterialToParam, extractPathsFromParam, extractTypeMap } from "./material";
export type { MaterialPathInputs, ApplyMaterialResult, ExtractedPaths } from "./material";
