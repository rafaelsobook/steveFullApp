const {WebXRControllerComponent,WebXRFeatureName} = BABYLON
const log = console.log
export function initCameraPanning(xrHelper){
    let spd = .4 //  1 === 100%

    const swappedHandednessConfiguration = [
        {
            allowedComponentTypes: [WebXRControllerComponent.THUMBSTICK_TYPE, WebXRControllerComponent.TOUCHPAD_TYPE],
            forceHandedness: "right",
            axisChangedHandler: (axes, movementState, featureContext, xrInput) => {
                const xAxis = axes.x * spd
                const yAxis = axes.y * spd
                movementState.rotateX = Math.abs(xAxis) > featureContext.rotationThreshold ? xAxis : 0;
                movementState.rotateY = Math.abs(yAxis) > featureContext.rotationThreshold ? yAxis : 0;
                log(axes)
                log(featureContext.rotationThreshold)
            },
        },
    ];
    xrHelper.baseExperience.featuresManager.enableFeature(WebXRFeatureName.MOVEMENT, "latest", {
        xrInput: xrHelper.input,
        customRegistrationConfigurations: swappedHandednessConfiguration,
    });
}
