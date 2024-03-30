import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express from 'express';

class Proposal {
   id: string;
   title: string;
   description: string;
   proposer: string;
   createdAt: Date;
   votes: { [voter: string]: boolean }; 
   status: 'Pending' | 'Active' | 'Completed';
   quorum: number; 
   expiryDate: Date; 
}

const proposalsStorage = StableBTreeMap<string, Proposal>(0);

export default Server(() => {
   const app = express();
   app.use(express.json());

   app.post("/proposals", (req, res) => {
      const proposal: Proposal =  {
         id: uuidv4(),
         createdAt: getCurrentDate(),
         votes: {},
         status: 'Pending',
         quorum: Math.floor(Math.random() * 10) + 1, 
         expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
         ...req.body
      };
      proposalsStorage.insert(proposal.id, proposal);
      res.json(proposal);
   });

   app.get("/proposals", (req, res) => {
      res.json(proposalsStorage.values());
   });

   app.get("/proposals/:id", (req, res) => {
      const proposalId = req.params.id;
      const proposalOpt = proposalsStorage.get(proposalId);
      if ("None" in proposalOpt) {
         res.status(404).send(`the proposal with id=${proposalId} not found`);
      } else {
         res.json(proposalOpt.Some);
      }
   });

   app.put("/proposals/:id", (req, res) => {
      const proposalId = req.params.id;
      const proposalOpt = proposalsStorage.get(proposalId);
      if ("None" in proposalOpt) {
         res.status(400).send(`couldn't update a proposal with id=${proposalId}. Proposal not found`);
      } else {
         const proposal = proposalOpt.Some;
         const updatedProposal = { ...proposal, ...req.body };
         proposalsStorage.insert(proposal.id, updatedProposal);
         res.json(updatedProposal);
      }
   });

   app.delete("/proposals/:id", (req, res) => {
      const proposalId = req.params.id;
      const deletedProposal = proposalsStorage.remove(proposalId);
      if ("None" in deletedProposal) {
         res.status(400).send(`couldn't delete a proposal with id=${proposalId}. Proposal not found`);
      } else {
         res.json(deletedProposal.Some);
      }
   });

   app.post("/proposals/:id/vote", (req, res) => {
      const proposalId = req.params.id;
      const { voter, vote } = req.body;

      const proposalOpt = proposalsStorage.get(proposalId);
      if ("None" in proposalOpt) {
         res.status(404).send(`the proposal with id=${proposalId} not found`);
      } else {
         const proposal = proposalOpt.Some;
         if (proposal.status !== 'Active') {
            res.status(400).send(`voting is not allowed on proposal with id=${proposalId}. Proposal status is ${proposal.status}`);
         } else {
            proposal.votes[voter] = vote;
            proposalsStorage.insert(proposalId, proposal);
            res.json(proposal);
         }
      }
   });

   return app.listen();
});

function getCurrentDate() {
   const timestamp = new Number(ic.time());
   return new Date(timestamp.valueOf() / 1000_000);
}
