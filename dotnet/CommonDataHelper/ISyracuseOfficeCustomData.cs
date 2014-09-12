using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper
{
    public interface ISyracuseOfficeCustomData
    {
        void setDocumentUrl(String url);
        String getDocumentUrl();
        string getServerUrl();
        string getDocumentRepresentation();
        string getResourceUrl();
        string getDocumentTitle();

        byte[] GetDocumentContent();
        void writeDictionaryToDocument();
    }
}
