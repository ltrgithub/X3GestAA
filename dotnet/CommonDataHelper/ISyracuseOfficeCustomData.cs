using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper
{
    public interface ISyracuseOfficeCustomData
    {
        void setDocumentUrl(String url);
        void setDocumentUrlAddress(String url);
        void setDocumentTitleAddress(String title);
        String getDocumentUrl();
        string getServerUrl();
        string getDocumentRepresentation();
        string getResourceUrl();
        string getDocumentTitle();

        byte[] GetDocumentContent();
        void writeDictionaryToDocument();
    }
}
