export interface TemplateConfig {
  button: SceneControlTool;
  data: MeasuredTemplateConstructorDataData;
}

export type MeasuredTemplateConstructorDataData = Parameters<
  foundry.data.MeasuredTemplateData['_initializeSource']
>[0];
