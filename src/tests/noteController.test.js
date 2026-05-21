

jest.mock('../models/Note', () => ({
   create: jest.fn(),
   findByIdAndUpdate: jest.fn()
}))

jest.mock('../models/User', () => ({}))

const noteController = require('../controllers/notesController')

const Note = require('../models/Note')

describe("Create Note Controller", () => {

   test("should create note successfully", async () => {

      const req = {

         body: {
            title: "OS Notes",
            content: "Unit Testing"
         },

         userId: "123"

      }

      const res = {

         redirect: jest.fn(),
         send: jest.fn()

      }

      Note.create.mockResolvedValue({
         title: "OS Notes"
      })

      await noteController.createNote(req, res)

      expect(Note.create).toHaveBeenCalled()

      expect(res.redirect).toHaveBeenCalledWith("/")

   })

})



test("should update note successfully", async () => {

   const req = {

      params: {
         id: "123"
      },

      body: {
         title: "Updated Title",
         content: "Updated Content"
      }

   }

   const res = {

      redirect: jest.fn(),
      send: jest.fn()

   }

   Note.findByIdAndUpdate = jest.fn().mockResolvedValue({})

   await noteController.updateNote(req, res)

   expect(Note.findByIdAndUpdate).toHaveBeenCalledWith(
      "123",
      {
         title: "Updated Title",
         content: "Updated Content"
      }
   )

   expect(res.redirect).toHaveBeenCalledWith("/")

})