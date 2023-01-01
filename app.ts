import express, { Request, Response, Application } from "express";
import cors from "cors";
import http from "http";
import axios from "axios";
import { createClient } from "redis";
import { RedisClientType } from "@redis/client";

const PORT = 9000;
const DEFAULT_EXPIRATION = 3600;

let redisClient: RedisClientType;

const axiosInstance = axios.create({ baseURL: "https://jsonplaceholder.typicode.com/" })

const app: Application = express();

app.use(cors());

(async () => {
    redisClient = createClient();
    redisClient.on("error", (error: any) => console.error(`Error : ${error}`));
    await redisClient.connect();
})()

app.get("/photos/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) return res.status(401).json({ message: "Cannot reach" });
    else {
        const photoWithAlbumId = await redisClient.get("photo?albumId=" + id);
        if (photoWithAlbumId) {
            return res.status(200).json({ message: "Success", data: JSON.parse(photoWithAlbumId) })
        }
        const { data } = await axiosInstance.get("/photos", {
            params: { albumId: id }
        });
        if (!data) return res.status(401).json({ message: "Cannot reach" });
        await redisClient.setEx("photo?albumId=" + id, DEFAULT_EXPIRATION, JSON.stringify(data));
        res.status(200).json({ message: "Success", data: data })
    }
})

app.get("/photos", async (req: Request, res: Response) => {
    const photos = await redisClient.get("photos");
    if (photos != null) {
        return res.status(200).json({ message: "photos fetched Successfully!", data: JSON.parse(photos) })
    } else {
        const { data } = await axiosInstance.get("/photos");
        if (!data || data.length < 0) {
            return res.status(403).json({ message: "Unable to fetch Photos" })
        }
        await redisClient.setEx("photos", DEFAULT_EXPIRATION, JSON.stringify(data));
        return res.status(200).json({ message: "photos fetched Successfully!", data: data })
    }
})

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log("app listening on port", PORT);
});
