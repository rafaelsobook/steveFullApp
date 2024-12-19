let state = "browser" // 'immersive-vr' - 'immersive-ar' - 'browser'
const log = console.log



export function setImmersiveState(newState){
    state = newState
}
export function getImmersiveState(){
    return state
}