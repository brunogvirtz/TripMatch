import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import groupsRouter from "./groups";
import destinationsRouter from "./destinations";
import swipesRouter from "./swipes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(groupsRouter);
router.use(destinationsRouter);
router.use(swipesRouter);

export default router;
