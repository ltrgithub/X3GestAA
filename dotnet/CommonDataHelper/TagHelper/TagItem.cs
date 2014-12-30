using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.TagHelper
{
    public class TagItem
    {
        private string _description;
        private string _tagJson;

        public TagItem(string description, string tagJson)
        {
            _description = description;
            _tagJson = tagJson;
        }

        public string Description
        {
            get { return _description; }
        }

        public string TagJson
        {
            get { return _tagJson; }
        }
    }
}
