// Animation features for <LazyMotion>, in their own module so the bundler
// splits them out of the initial JavaScript. domMax (not domAnimation) because
// a few components use layout and drag animations.
import { domMax } from "motion/react";

export default domMax;
