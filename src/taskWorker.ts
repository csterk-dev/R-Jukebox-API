import { parentPort } from "worker_threads";

parentPort?.on("message", (e: MessageEvent<any>) => {
  (async () => {
    const isShuttingDown = e.data[0];
    const tasks = e.data[1];
    while (!isShuttingDown) {
      console.log("AHHHHHHHH")
      try {
        console.log("BURGER")
        const task = tasks.dequeue();
        if (!task) continue;
  
        // eslint-disable-next-line no-await-in-loop
        await task();
        console.log("ENDDDDD")
  
      } catch (err: any) {
        console.error(err);
      }
    }
    parentPort?.postMessage("done");
  })();
})