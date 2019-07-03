import divideSegment from './divide_segment';
import intersection  from './intersection';
import compareEvents from './compare_events';
import { equals }    from './types';
import {
  NON_CONTRIBUTING,
  SAME_TRANSITION,
  DIFFERENT_TRANSITION
} from './edge_type';
import SweepEvent from './sweep_event';
import Queue from 'tinyqueue';

const intersections:[[number, number], [number, number]] = [[0,0],[0,0]];

export default function possibleIntersection (
  se1:SweepEvent, se2:SweepEvent,
  queue:Queue<SweepEvent>
):0|1|2|3 {
  // that disallows self-intersecting polygons,
  // did cost us half a day, so I'll leave it
  // out of respect
  // if (se1.isSubject === se2.isSubject) return;
  const a = se1.point, b = se1.otherEvent.point,
        c = se2.point, d = se2.otherEvent.point;
  const nintersections:number = intersection(
    a[0], a[1], b[0], b[1], 
    c[0], c[1], d[0], d[1],
    intersections
  );

  if (nintersections === 0) return 0; // no intersection

  // the line segments intersect at an endpoint of both line segments
  if ((nintersections === 1) &&
      (equals(se1.point, se2.point) ||
       equals(se1.otherEvent.point, se2.otherEvent.point))) {
    return 0;
  }

  // best would be to skip it
  if (nintersections === 2 && se1.isSubject === se2.isSubject) {
    // if(se1.contourId === se2.contourId){
    // console.warn('Edges of the same polygon overlap',
    //   se1.point, se1.otherEvent.point, se2.point, se2.otherEvent.point);
    // }
    //throw new Error('Edges of the same polygon overlap');
    return 0;
  }

  // The line segments associated to se1 and se2 intersect
  if (nintersections === 1) {

    // if the intersection point is not an endpoint of se1
    if (!equals(se1.point, intersections[0]) && !equals(se1.otherEvent.point, intersections[0])) {
      divideSegment(se1, intersections[0], queue);
    }

    // if the intersection point is not an endpoint of se2
    if (!equals(se2.point, intersections[0]) && !equals(se2.otherEvent.point, intersections[0])) {
      divideSegment(se2, intersections[0], queue);
    }
    return 1;
  }

  // The line segments associated to se1 and se2 overlap
  const events        = [];
  let leftCoincide  = false;
  let rightCoincide = false;

  if (equals(se1.point, se2.point)) {
    leftCoincide = true; // linked
  } else if (compareEvents(se1, se2) === 1) {
    events.push(se2, se1);
  } else {
    events.push(se1, se2);
  }

  if (equals(se1.otherEvent.point, se2.otherEvent.point)) {
    rightCoincide = true;
  } else if (compareEvents(se1.otherEvent, se2.otherEvent) === 1) {
    events.push(se2.otherEvent, se1.otherEvent);
  } else {
    events.push(se1.otherEvent, se2.otherEvent);
  }

  if ((leftCoincide && rightCoincide) || leftCoincide) {
    // both line segments are equal or share the left endpoint
    se2.type = NON_CONTRIBUTING;
    se1.type = (se2.inOut === se1.inOut)
      ? SAME_TRANSITION : DIFFERENT_TRANSITION;

    if (leftCoincide && !rightCoincide) {
      // honestly no idea, but changing events selection from [2, 1]
      // to [0, 1] fixes the overlapping self-intersecting polygons issue
      divideSegment(events[1].otherEvent, events[0].point, queue);
    }
    return 2;
  }

  // the line segments share the right endpoint
  if (rightCoincide) {
    divideSegment(events[0], events[1].point, queue);
    return 3;
  }

  // no line segment includes totally the other one
  if (events[0] !== events[3].otherEvent) {
    divideSegment(events[0], events[1].point, queue);
    divideSegment(events[1], events[2].point, queue);
    return 3;
  }

  // one line segment includes the other one
  divideSegment(events[0], events[1].point, queue);
  divideSegment(events[3].otherEvent, events[2].point, queue);

  return 3;
}