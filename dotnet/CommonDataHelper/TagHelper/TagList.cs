using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.SyracuseTagHelper.Model;


namespace CommonDataHelper.TagHelper
{
    public class TagList
    {
        public List<TagItem> createTagList()
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

            List<TagItem> tagsList = new List<TagItem>();
            if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
            {
                /*
                 * When one or more tags are selected, the payload sent to the server includes the entire tag item json, and not just the Uuid
                 * We'll therefore get the json for each tag item, then extract the description separately for displaying in the drop down.
                 */
                var tags = Newtonsoft.Json.JsonConvert.DeserializeObject<TagsModel>(responseJson);

                foreach (object tag in tags.tags)
                {
                    string tagDescription = Newtonsoft.Json.JsonConvert.DeserializeObject<TagModel>(tag.ToString()).description;
                    tagsList.Add(new TagItem(tagDescription, tag.ToString()));
                }
            }
            return tagsList;
        }
    }
}
