using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDataHelper.PublisherHelper.Model.Word;
using System.Net;
using System.Web;
using System.Collections.Specialized;

namespace CommonDataHelper.PublisherHelper
{
    public class PublisherHelper : IDocumentPublisher
    {
        public void PublishDocument(ISyracuseOfficeCustomData syracuseCustomData)
        {
            WordSavePrototype wordSaveNewDocumentPrototype = getWordSaveDocumentPrototypes().links.wordSaveNewDocumentPrototype;

            WordWorkingCopyPrototype wordWorkingCopyPrototype = getWordWorkingCopyPrototype(wordSaveNewDocumentPrototype);

            initialiseWorkingCopy(wordSaveNewDocumentPrototype, wordWorkingCopyPrototype, syracuseCustomData);
        }   

        private WordDocumentPrototypes getWordSaveDocumentPrototypes()
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            Uri pageUrl = new Uri(baseUrl, @"/sdata/syracuse/collaboration/syracuse/$prototypes('msoWordDocument.$query')");

            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;

            string prototypeJson = webHelper.getServerJson(pageUrl.ToString(), out httpStatusCode);

            if (httpStatusCode == HttpStatusCode.OK)
                return Newtonsoft.Json.JsonConvert.DeserializeObject<WordDocumentPrototypes>(prototypeJson);

            return null;
        }

        private WordWorkingCopyPrototype getWordWorkingCopyPrototype(WordSavePrototype wordSaveNewDocumentPrototype)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            WebHelper webHelper = new WebHelper();

            HttpStatusCode httpStatusCode;
            string wordWorkingCopyPrototypeJson = webHelper.setServerJson(new Uri(baseUrl, wordSaveNewDocumentPrototype.url), wordSaveNewDocumentPrototype.method, String.Empty, out httpStatusCode);

            if (httpStatusCode == HttpStatusCode.OK)
                return Newtonsoft.Json.JsonConvert.DeserializeObject<WordWorkingCopyPrototype>(wordWorkingCopyPrototypeJson);

            return null;
        }

        private void initialiseWorkingCopy(WordSavePrototype wordSaveNewDocumentPrototype, WordWorkingCopyPrototype wordWorkingCopyPrototype, ISyracuseOfficeCustomData syracuseCustomData)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return;
            }
            
            string templateClass = syracuseCustomData.getDocumentRepresentation(); //"user.$query";
            string locale = String.Empty;
            string volumeCode = "STD";
 
            string representationName = HttpUtility.ParseQueryString(new Uri(baseUrl, syracuseCustomData.getResourceUrl()).Query).Get("representation"); // "user.$bulk"; 

            string className = "users";
            string x3Keys = String.Empty;
            string officeEndpoint = "syracuse";
            string trackingId = wordWorkingCopyPrototype.trackingId;

            StringBuilder queryParameters = new StringBuilder(wordSaveNewDocumentPrototype.url);

            queryParameters.Append("?");

            queryParameters.Append("&templateClass=");
            queryParameters.Append(templateClass);

            if (locale == null)
            {
                queryParameters.Append("&templateLocale=");
                queryParameters.Append(locale);
            }

            queryParameters.Append("&volumeCode=");
            queryParameters.Append(volumeCode);

            queryParameters.Append("&representationName=");
            queryParameters.Append(representationName);

            queryParameters.Append("&className=");
            queryParameters.Append(className);

            queryParameters.Append("&x3Keys=");
            queryParameters.Append(x3Keys);

            queryParameters.Append("&officeEndpoint=");
            queryParameters.Append(officeEndpoint);

            queryParameters.Append("&trackingId=");
            queryParameters.Append(trackingId);

            WebHelper webHelper = new WebHelper();

            HttpStatusCode httpStatusCode;
            string test = webHelper.setServerJson(new Uri(baseUrl, queryParameters.ToString()), "POST", String.Empty, out httpStatusCode);
        }
    }
}
