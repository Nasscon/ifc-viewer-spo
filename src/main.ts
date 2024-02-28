import * as OBC from "openbim-components"
import * as THREE from "three"
import { ExampleTool } from "./bim-components"

const viewer = new OBC.Components()

const sceneComponent = new OBC.SimpleScene(viewer)
sceneComponent.setup()
viewer.scene = sceneComponent

const viewerContainer = document.getElementById("sharepoint-ifcviewer") as HTMLDivElement
const rendererComponent = new OBC.PostproductionRenderer(viewer, viewerContainer)
viewer.renderer = rendererComponent
const postproduction = rendererComponent.postproduction

const cameraComponent = new OBC.OrthoPerspectiveCamera(viewer)
viewer.camera = cameraComponent

const raycasterComponent = new OBC.SimpleRaycaster(viewer)
viewer.raycaster = raycasterComponent

await viewer.init()
postproduction.enabled = true

const grid = new OBC.SimpleGrid(viewer, new THREE.Color(0x666666))
postproduction.customEffects.excludedMeshes.push(grid.get())

const ifcLoader = new OBC.FragmentIfcLoader(viewer)

//custom addition to use the viewer in SPO
//Getting the packages from the site where all the JS libraries are stored, this is only needed for the SPO integration
ifcLoader.settings.wasm = {
  absolute: true,
  path: "https://unpkg.com/web-ifc@0.0.44/"
};

//Stop custom addition to use the viewer in SPO

await ifcLoader.setup()





const highlighter = new OBC.FragmentHighlighter(viewer)
await highlighter.setup()

const culler = new OBC.ScreenCuller(viewer)
await culler.setup()
cameraComponent.controls.addEventListener("sleep", () => culler.needsUpdate = true)

const propertiesProcessor = new OBC.IfcPropertiesProcessor(viewer)
highlighter.events.select.onClear.add(() => {
  propertiesProcessor.cleanPropertiesList()
})

ifcLoader.onIfcLoaded.add(async model => {
  for (const fragment of model.items) { culler.add(fragment.mesh) }
  propertiesProcessor.process(model)
  highlighter.events.select.onHighlight.add((selection) => {
    const fragmentID = Object.keys(selection)[0]
    const expressID = Number([...selection[fragmentID]][0])
    propertiesProcessor.renderProperties(model, expressID)
  })
  highlighter.update()
  culler.needsUpdate = true
})

const exampleTool = new ExampleTool(viewer)
await exampleTool.setup({
  message: "Hi there from ExampleTool!",
  requiredSetting: 123
})

const mainToolbar = new OBC.Toolbar(viewer)
mainToolbar.addChild(
  ifcLoader.uiElement.get("main"),
  propertiesProcessor.uiElement.get("main"),
  exampleTool.uiElement.get("activationBtn")
)

viewer.ui.addToolbar(mainToolbar);

//custom addition to use the viewer in SPO
//providing a way for SharePoint to control the BimViewer as coded above. This means that we can use the files stored on SPO.
//This event fires everytime SharePoint calls the openIFCfile parameter
window.addEventListener("openIFCfile", async (event: any) => {
  const {name, payLoad} = event.detail;
  if(name === "openModel") {
    const {name, buffer} = payLoad;
    const model = await ifcLoader.load(buffer, name);
    const scene = viewer.scene.get();
    scene.add(model);
  }
})