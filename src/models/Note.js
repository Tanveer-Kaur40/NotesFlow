// const mongoose = require("mongoose");

// const noteSchema = new mongoose.Schema({
//     title: {
//         type: String,
//         required: true
//     },
//     content: {
//         type: String,
//         required: true
//     },
//     pinned: {
//         type: Boolean,
//         default: false
//     },
//     archived: {
//         type: Boolean,
//         default: false
//     },
//     deleted: {
//         type: Boolean,
//         default: false
//     },
//     deletedAt: {
//         type: Date,
//         default: null
//     },
//     filePath: {
//         type: String,
//         default: null
//     },
//     attachments: [{
//         url: String,
//         filename: String,
//         public_id: String,
//         resource_type: String
//     }],
//     user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true
//     }
// }, { timestamps: true });

// module.exports = mongoose.model("Note", noteSchema);



// const mongoose = require("mongoose");

// const noteSchema = new mongoose.Schema({
//     title: {
//         type: String,
//         required: true
//     },
//     content: {
//         type: String,
//         required: true
//     },
//     pinned: {
//         type: Boolean,
//         default: false
//     },
//     archived: {
//         type: Boolean,
//         default: false
//     },
//     deleted: {
//         type: Boolean,
//         default: false
//     },
//     deletedAt: {
//         type: Date,
//         default: null
//     },
//     filePath: {
//         type: String,
//         default: null
//     },
//     imageUrl: {                  
//         type: String,
//         default: ""
//     },
//     attachments: [{
//         url: String,
//         filename: String,
//         public_id: String,
//         resource_type: String
//     }],
//     user: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true
//     }
// }, { timestamps: true });

// module.exports = mongoose.model("Note", noteSchema);
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },

    content: {
        type: String,
        required: true
    },

    pinned: {
        type: Boolean,
        default: false
    },

    archived: {
        type: Boolean,
        default: false
    },

    deleted: {
        type: Boolean,
        default: false
    },

    deletedAt: {
        type: Date,
        default: null
    },

    attachments: [{
        url: {
            type: String
        },

        filename: {
            type: String
        },

        public_id: {
            type: String
        },

        resource_type: {
            type: String
        }
    }],

    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

}, { timestamps: true });

module.exports = mongoose.model("Note", noteSchema);