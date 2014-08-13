using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.SyracuseTagHelper.Model;

namespace CommonDataHelper.TagHelper
{
    public class TagHelper
    {
        public List<string> createTagList()
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            string page = baseUrl.ToString() + @"sdata/syracuse/collaboration/syracuse/documentTags?representation=documentTag.$query&count=200";

            WebHelper webHelper = new WebHelper();

            HttpStatusCode httpStatusCode;

            string responseJson = webHelper.getServerJson(page, out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            List<string> tagsList = new List<string>();
            if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
            {
                var syracuseTags = Newtonsoft.Json.JsonConvert.DeserializeObject<SyracuseTags>(responseJson);

                foreach (SyracuseTag syracuseTag in syracuseTags.tags)
                {
                    tagsList.Add(syracuseTag.description);
                }
            }
            return tagsList;
        }
    }
}
