using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.PurposeHelper;
using CommonDataHelper.PurposeHelper.Model;

namespace CommonDataHelper
{
    public class PurposeList
    {
        public List<PurposeItem> createPurposeList(string templateClass)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            StringBuilder page = new StringBuilder (baseUrl.ToString());
            page.Append(@"sdata/syracuse/collaboration/syracuse/lookupTemplatePurposeses?representation=lookupTemplatePurposes.$lookup");
            page.Append(@"&templateClass=");
            page.Append(templateClass); //user.$query");
            page.Append(@"&templateType=report&count=50"); 
            
            List<PurposeItem> purposeList = new List<PurposeItem>();
            WebHelper cd = new WebHelper();

            HttpStatusCode httpStatusCode;
            string responseJson = cd.getServerJson(page.ToString(), out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
            {
                var purposes = Newtonsoft.Json.JsonConvert.DeserializeObject<PurposesModel>(responseJson);

                foreach (PurposeModel purpose in purposes.purposes)
                {
                    purposeList.Add(new PurposeItem(purpose.name, purpose.uuid));
                }
            }
            return purposeList;
        }
    }
}
