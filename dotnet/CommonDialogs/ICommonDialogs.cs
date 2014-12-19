using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDialogs
{
    interface IPublishDocumentModel
    {
    }

    interface IPublishDocumentView
    {
        event EventHandler DataChanged;
        string Description { get; set; }
        //string Email { get; set; }
        //void Show();
    }
}
