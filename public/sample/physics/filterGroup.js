export const FILTER_GROUP_REMOTE_DESCRIPTION = 1
export const FILTER_GROUP_OWNER_CAPSULE = 2
export const COLLIDES_WITH_ALL = 0xFFFFFFFF;


export function assignGroup(aggregate, group){
    aggregate.shape.filterMembershipMask = group
}

// export function filterCollideMask(aggregate, notCollideWithThisGroup){
//     aggregate.shape.filterCollideMask = COLLIDES_WITH_ALL & ~notCollideWithThisGroup;
// }
export function filterCollideMask(aggregate, groupToCollideWith){
    aggregate.shape.filterCollideMask = groupToCollideWith
}