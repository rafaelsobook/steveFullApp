import { getScene } from "../scenes/createScene.js"
import { assignGroup } from "./filterGroup.js"

const { PhysicsAggregate , PhysicsShapeType } = BABYLON


export function createAggregate(mesh, massOpt, meshType){
    const scene = getScene()
    let ShapeType
    switch(meshType){
        case "sphere":
            ShapeType = PhysicsShapeType.SPHERE
        break
        case "capsule":
            ShapeType = PhysicsShapeType.CAPSULE
        break
        case "imported":
        case "model":
        case "mesh":
            ShapeType = PhysicsShapeType.MESH
        break
        case "heightmap":
            ShapeType = PhysicsShapeType.MESH
        break
        default:
            ShapeType = PhysicsShapeType.BOX
        break
    }
    
    const aggregate = new PhysicsAggregate(mesh, ShapeType, massOpt,scene)
    // aggregate.body.disablePreStep = false
    return aggregate
}